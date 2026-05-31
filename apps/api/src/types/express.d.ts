import { AccessTokenPayload } from '../lib/jwt'

declare global {
  namespace Express {
    // Merged with Passport's User interface to satisfy req.user typing
    interface User extends AccessTokenPayload {}
    interface Request {
      user?: AccessTokenPayload
    }
  }
}
