import { createContext, useContext } from 'react';

// The current pathname, so shared page pieces (heroes, CTA bands) can match the landing page's
// product without every route passing it down. Provided by src/App.jsx.
export const RouteContext = createContext('/');
export const useRoute = () => useContext(RouteContext);
