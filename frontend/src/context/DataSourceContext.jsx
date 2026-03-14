import React, { createContext, useContext, useState } from 'react';

const DataSourceContext = createContext();

export const DataSourceProvider = ({ children }) => {
  const [useDummy, setUseDummy] = useState(true);

  return (
    <DataSourceContext.Provider value={{ useDummy, setUseDummy }}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = () => {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSource must be used inside DataSourceProvider');
  return ctx;
};
