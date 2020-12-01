import path from "path";
import { URL } from "url";
import fetch, { Response, RequestInit, FetchError } from "node-fetch";

export class RequestError extends Error {
  constructor(readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class HttpError extends RequestError {
  constructor(readonly statusCode: number, readonly statusText: string) {
    super(`HTTP status code ${statusCode} (${statusText})`);
  }
}

type MaybePromise<T> = Promise<T> | T;

export type AnyState = { [K in string]?: any };

export type EmptyState = { [K in string]?: never };

export function isEmptyState(state: AnyState): state is EmptyState {
  return Object.keys(state).length === 0;
}

export type Installation<State extends AnyState> = {
  removed: boolean;
  state: EmptyState | State;
};

export type Asset = Readonly<{
  type: "ip" | "email" | "domain" | "opaque";
  value: string;
  key?: string;
  props?: Record<string, unknown>;
}>;

export class API<InstallationState extends AnyState = AnyState> {
  private readonly apiToken: string;
  private readonly baseUrl: URL;

  constructor(apiUrl: string, apiToken: string) {
    this.apiToken = apiToken;

    this.baseUrl = new URL(apiUrl);
    this.baseUrl.pathname = path.posix.join(this.baseUrl.pathname, "app/");
  }

  private installationUrl(installationId: string, path?: string): URL {
    if (!installationId.match(/^[a-z0-9_-]{1,}$/i)) {
      throw new Error("invalid installation ID");
    }
    const url = new URL(`installations/${installationId}`, this.baseUrl);
    if (path) {
      url.pathname += `/${path}`;
    }
    url.pathname = url.pathname.replace(/\/+/g, "/");
    return url;
  }

  private async request(url: URL, options: RequestInit): Promise<Response> {
    const headers = {
      Authorization: `Bearer ${this.apiToken}`,
      ...options.headers,
    };

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        timeout: 90000,
        ...options,
        headers,
      });
    } catch (err) {
      if (err instanceof FetchError) {
        throw new RequestError(err.message);
      }
      throw err;
    }
    if (!response.ok) {
      throw new HttpError(response.status, response.statusText);
    }
    return response;
  }

  async checkAuthToken(
    token: string
  ): Promise<{ installationId: string; sessionId: string; expiresAt: number }> {
    const result = await this.request(new URL("token", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
      }),
    }).then((r) => r.json());
    return result;
  }

  async seal(data: unknown, expiresIn: number): Promise<string> {
    const result = await this.request(new URL("seal", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expiresIn,
        data,
      }),
    }).then((r) => r.json());
    return result.data;
  }

  async unseal(data: string): Promise<any> {
    const result = await this.request(new URL("unseal", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
      }),
    }).then((r) => r.json());
    return result.data;
  }

  async getInstallations(): Promise<{ id: string; removed: boolean }[]> {
    return this.request(new URL("installations", this.baseUrl), {
      method: "GET",
    }).then((r) => r.json());
  }

  async createInstallationCallback(
    installationId: string,
    sessionId: string,
    callback: {
      action?: unknown;
      clientState?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const { url } = await this.request(
      this.installationUrl(installationId, "/callbacks"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          action: callback.action,
          clientState: callback.clientState,
        }),
      }
    ).then((r) => r.json());
    return url;
  }

  async getInstallation(
    installationId: string
  ): Promise<Installation<InstallationState>> {
    const { removed, state } = await this.request(
      this.installationUrl(installationId),
      {
        method: "GET",
      }
    ).then((r) => r.json());
    return { removed, state };
  }

  async updateInstallation(
    installationId: string,
    callback: (
      installation: Installation<InstallationState>
    ) => MaybePromise<{
      assets?: Asset[];
      state?: InstallationState | EmptyState;
    } | void>
  ): Promise<Installation<InstallationState>> {
    const url = this.installationUrl(installationId);

    for (;;) {
      const response = await this.request(url, { method: "GET" });
      const etag = response.headers.get("etag");
      const input = await response.json();

      const patch = await callback(JSON.parse(JSON.stringify(input)));
      if (!patch) {
        return input;
      }
      const { assets, state } = patch;
      if (!assets && !state) {
        return input;
      }

      try {
        await this.request(url, {
          method: "PATCH",
          headers: {
            "If-Match": etag || "*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 412) {
          continue;
        }
        throw err;
      }
      return { ...input, ...patch };
    }
  }

  async removeInstallation(installationId: string): Promise<void> {
    await this.request(this.installationUrl(installationId), {
      method: "DELETE",
    }).then((r) => r.arrayBuffer());
  }
}
