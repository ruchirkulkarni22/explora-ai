// client/src/context/AuthContext.jsx
import { createContext } from 'react';

// This file now ONLY creates and exports the context object.
// It contains no React components, which satisfies the Fast Refresh rule.
export const AuthContext = createContext(null);