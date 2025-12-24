export const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error("Prisma has been removed. Use DynamoDB repositories instead.");
    },
  },
);
