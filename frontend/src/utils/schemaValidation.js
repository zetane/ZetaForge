import { z } from "zod";

export default function generateSchema(pipeline) {
  const schemaFields = {};
  for (const [key, value] of Object.entries(pipeline)) {
      switch (typeof value) {
          case "object":
              if (!Array.isArray(value)) {
                  schemaFields[key] = generateSchema(value);
              }
              break;
          case "string":
            schemaFields[key] = (key === "value") ? (
              z.string().refine((val) => val.replace(/['"]+/g, '').trim().length !== 0, {message: "The input value of this block must contain at least 1 character(s)"})
            ) : (
              z.string()
            )
              break;
          case "number":
              schemaFields[key] = z.number();
              break;
          case "boolean":
              schemaFields[key] = z.boolean();
              break;
          default:
              schemaFields[key] = z.unknown();
      }
  }
  return z.object(schemaFields);
}