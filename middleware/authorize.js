import jwt from 'jsonwebtoken';
import { defineAbilityFor } from '../lib/ability';

export function authorize(action, subject) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const ability = defineAbilityFor(user);

      if (ability.can(action, subject)) {
        req.user = user;
        next();
      } else {
        res.status(403).json({ message: 'Forbidden' });
      }
    } catch (e) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
}