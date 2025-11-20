import Realm from 'realm';
import { realm } from './realm';

export function insertItem<T extends Record<string, any>>(
  schemaName: string,
  data: T
): T {
  let created: T;
  realm.write(() => {
    created = realm.create(schemaName, {
      _id: new Realm.BSON.ObjectId(),
      ...data,
    }) as unknown as T;
  });
  return created!;
}

export function getAllItems<T extends Record<string, any>>(
  schemaName: string
): Realm.Results<any> {
  return realm.objects(schemaName);
}

export function getFilteredItems<T extends Record<string, any>>(
  schemaName: string,
  filter: string,
  args?: any[]
): Realm.Results<any> {
  return realm.objects(schemaName).filtered(filter, ...(args || []));
}

export function updateItem<T extends Record<string, any>>(
  schemaName: string,
  id: Realm.BSON.ObjectId,
  data: Partial<T>
): T | undefined {
  let updated: T | undefined;
  realm.write(() => {
    const item = realm.objectForPrimaryKey(schemaName, id);
    if (item) {
      Object.assign(item, data);
      updated = item as unknown as T;
    }
  });
  return updated;
}

export function getItemById<T extends Record<string, any>>(
  schemaName: string,
  id: string | number
): T | null {
  const result = realm.objects<T>(schemaName).filtered('_id == $0', id);
  return result.length > 0 ? result[0] : null; // Retorna o primeiro item ou null se não encontrado
}

export function deleteItem(
  schemaName: string,
  id: Realm.BSON.ObjectId
): void {
  realm.write(() => {
    const item = realm.objectForPrimaryKey(schemaName, id);
    if (item) {
      realm.delete(item);
    }
  });
}
