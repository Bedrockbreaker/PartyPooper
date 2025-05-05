import type { ObjectFieldSchema, PrimitiveType, SchemaDefinition, SchemaKind, TupleElementSchema } from "../AST/AST";

type GenerateSchemaResult = { typeName: string, kind: SchemaKind };

function GenerateSchema(
	value: any,
	typeHint: string,
	schemaRegistry: Map<string, SchemaDefinition>
): GenerateSchemaResult {
	if (value === null) return { typeName: "null", kind: "primitive" };

	const valueType = typeof(value);

	if (valueType === "string" || valueType === "number" || valueType === "boolean") {
		schemaRegistry.set(typeHint, { kind: "primitive", valueType: valueType as PrimitiveType });
		return { typeName: typeHint, kind: "primitive" };
	}

	if (Array.isArray(value)) {
		// const elementSampleType = typeof(value[0]);
		// const isTuple = !value.every(v => typeof(v) === elementSampleType);

		const isTuple = true;

		if (isTuple) {
			const fields: Record<string, TupleElementSchema> = {};

			for (let i = 0; i < value.length; i++) {
				const fieldName = `$${i}`;
				const fieldTypeHint = `${typeHint}_${fieldName}`;
				const inferred = GenerateSchema(value[i], fieldTypeHint, schemaRegistry);

				fields[fieldName] = {
					kind: inferred.kind,
					index: i,
					type: inferred.typeName
				};
			}

			schemaRegistry.set(typeHint, { kind: "tuple", fields });
			return { typeName: typeHint, kind: "tuple" };
		} else {
			const elementSample = value[0];
			
			// Empty array
			if (elementSample === undefined) {
				schemaRegistry.set(typeHint, {
					kind: "array",
					elementType: "null",
					elementKind: "primitive"
				});
				return { typeName: typeHint, kind: "array" };
			}

			const elementHint = `${typeHint}_element`;
			const inferred = GenerateSchema(elementSample, elementHint, schemaRegistry);

			schemaRegistry.set(typeHint, {
				kind: "array",
				elementType: inferred.typeName,
				elementKind: inferred.kind
			});
			return { typeName: typeHint, kind: "array" };
		}
	}

	if (valueType === "object") {
		const fields: Record<string, ObjectFieldSchema> = {};

		for (const [k, v] of Object.entries(value)) {
			const fieldHint = `${typeHint}_${k}`;
			const inferred = GenerateSchema(v, fieldHint, schemaRegistry);

			fields[k] = {
				kind: inferred.kind,
				name: k,
				type: inferred.typeName
			};
		}

		schemaRegistry.set(typeHint, { kind: "object", fields });
		return { typeName: typeHint, kind: "object" };
	}

	throw new Error(`Unknown value type for inference: ${value}`);
}

export function GenerateRawSchema(data: object): Record<string, SchemaDefinition> {
	const schemaRegistry = new Map<string, SchemaDefinition>();

	GenerateSchema(data, "Root", schemaRegistry);

	return Object.fromEntries(schemaRegistry.entries());
}
