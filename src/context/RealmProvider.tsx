import React from 'react';
import {RealmProvider} from '@realm/react';
import {TransactionSchema} from '../schema/TransactionSchema';

export function AppRealmProvider({children}: {children: React.ReactNode}) {
  return (
    <RealmProvider schema={[TransactionSchema]}>
      {children}
    </RealmProvider>
  );
}
