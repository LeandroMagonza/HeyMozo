import { createContext, useContext } from 'react';

const ShellContext = createContext(false);

export const useInsideShell = () => useContext(ShellContext);

export default ShellContext;
