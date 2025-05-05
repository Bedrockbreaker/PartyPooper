export type PrimitiveType = "string" | "number" | "boolean" | "null";

export type SchemaKind = "primitive" | "tuple" | "object" | "array" | "enum";

export interface Schema {
	kind: SchemaKind;
}

export interface PrimitiveSchema extends Schema {
	kind: "primitive";
	valueType: PrimitiveType;
}

export interface TupleElementSchema {
	kind: SchemaKind;
	index: number;
	type: string;
}

export interface TupleSchema {
	kind: "tuple";
	fields: Record<string, TupleElementSchema>;
}

export interface ObjectFieldSchema {
	kind: SchemaKind;
	name: string;
	type: string;
}

export interface ObjectSchema {
	kind: "object";
	fields: Record<string, ObjectFieldSchema>;
}

export interface ArraySchema {
	kind: "array";
	elementType: string;
	elementKind: SchemaKind;
}

export type SchemaDefinition =
	| PrimitiveSchema
	| TupleSchema
	| ObjectSchema
	| ArraySchema;
