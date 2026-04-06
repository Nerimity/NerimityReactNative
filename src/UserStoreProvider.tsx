import { createContext, JSX, useContext, useState } from 'react';

export interface User {
  id: string;
  username: string;
}

interface UserStoreContextValue {
  users: Record<string, User>;
  setUsers: React.Dispatch<React.SetStateAction<Record<string, User>>>;
}

const UserStoreContext = createContext<UserStoreContextValue | null>(null);

export const UserStoreProvider = (props: { children: JSX.Element }) => {
  const [users, setUsers] = useState<Record<string, User>>({});

  const value = {
    users,
    setUsers,
  } as UserStoreContextValue;

  return (
    <UserStoreContext.Provider value={value}>
      {props.children}
    </UserStoreContext.Provider>
  );
};
export const useUserStore = () => {
  const userStore = useContext(UserStoreContext);
  if (!userStore) {
    throw new Error('useUserStore must be used within a UserStoreProvider');
  }
  return userStore;
};
