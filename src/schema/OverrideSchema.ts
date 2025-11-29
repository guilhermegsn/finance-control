import { ObjectSchema } from "realm";

export const OverrideSchema: ObjectSchema = {
    name: 'Override',
    primaryKey: '_id',
    properties: {
        _id: 'string',
        parentId: 'string',   
        year: 'int',
        month: 'int',
        description: 'string',
        value: 'double', 
        type: 'string',
        date: 'date'
    },
};
