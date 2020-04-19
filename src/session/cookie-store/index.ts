import Iron from '@hapi/iron';
import { IncomingMessage, ServerResponse } from 'http';

import { ISessionStore } from '../store';
import Session, { ISession } from '../session';
import CookieSessionStoreSettings from './settings';
import { setCookie, parseCookies } from '../../utils/cookies';

export default class CookieSessionStore implements ISessionStore {
  private settings: CookieSessionStoreSettings;

  constructor(settings: CookieSessionStoreSettings) {
    this.settings = settings;
  }

  /**
   * Read the session from the cookie.
   * @param req HTTP request
   */
  async read(req: IncomingMessage): Promise<ISession | null> {
    if (!req) {
      throw new Error('Request is not available');
    }

    const { cookieSecret, cookieName } = this.settings;

    const cookies = parseCookies(req);
    const cookie = cookies[cookieName];
    if (!cookie || cookie.length === 0) {
      return null;
    }

    const unsealed = await Iron.unseal(cookies[cookieName], cookieSecret, Iron.defaults);
    if (!unsealed) {
      return null;
    }

    return unsealed as ISession;
  }

  /**
   * Write the session to the cookie.
   * @param req HTTP request
   */
  async save(req: IncomingMessage, res: ServerResponse, session: ISession): Promise<ISession | null> {
    if (!res) {
      throw new Error('Response is not available');
    }

    if (!req) {
      throw new Error('Request is not available');
    }

    const { cookieSecret, cookieName, cookiePath, cookieLifetime, cookieDomain, cookieSameSite } = this.settings;

    const { idToken, accessToken, accessTokenExpiresAt, accessTokenScope, refreshToken, user, createdAt } = session;
    const persistedSession = new Session(user, createdAt);

    if (this.settings.storeIdToken && idToken) {
      persistedSession.idToken = idToken;
    }

    if (this.settings.storeAccessToken && accessToken) {
      persistedSession.accessToken = accessToken;
      persistedSession.accessTokenScope = accessTokenScope;
      persistedSession.accessTokenExpiresAt = accessTokenExpiresAt;
    }

    if (this.settings.storeRefreshToken && refreshToken) {
      persistedSession.refreshToken = refreshToken;
    }

    const encryptedSession = await Iron.seal(persistedSession, cookieSecret, Iron.defaults);
    setCookie(req, res, {
      name: cookieName,
      value: encryptedSession,
      path: cookiePath,
      maxAge: cookieLifetime,
      domain: cookieDomain,
      sameSite: cookieSameSite
    });

    return persistedSession;
  }

  async rollover(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!res) {
      throw new Error('Response is not available');
    }

    if (!req) {
      throw new Error('Request is not available');
    }

    const { cookieName, cookiePath, cookieLifetime, cookieDomain, cookieSameSite } = this.settings;
    const cookies = parseCookies(req);
    const sessionValue = cookies[cookieName];

    if (!sessionValue) {
      return;
    }

    setCookie(req, res, {
      name: cookieName,
      value: sessionValue,
      path: cookiePath,
      maxAge: cookieLifetime,
      domain: cookieDomain,
      sameSite: cookieSameSite
    });
  }
}
