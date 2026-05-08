declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        account_type: string;
      };
    }
  }
}

export {};
