const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

p.product
  .findMany({ select: { id: true, name: true, image: true, demonstrations: true } })
  .then((rows) => {
    const match = rows.filter(
      (x) =>
        x.name.toLowerCase().includes("criativ") ||
        x.name.toLowerCase().includes("template"),
    );
    match.forEach((x) => {
      const d = x.demonstrations ? JSON.parse(x.demonstrations) : [];
      console.log("ID:", x.id);
      console.log("NAME:", x.name);
      console.log("IMAGE:", x.image);
      console.log("DEMOS (" + d.length + "):", d);
      console.log("---");
    });
    p.$disconnect();
  });
