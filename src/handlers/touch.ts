import { NextApiRequest, NextApiResponse } from 'next';
import { ISessionStore } from '../session/store';

export default function touchHandler(sessionStore: ISessionStore) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (!req) {
      throw new Error('Request is not available');
    }

    if (!res) {
      throw new Error('Response is not available');
    }

    await sessionStore.rollover(req, res);
  };
}
