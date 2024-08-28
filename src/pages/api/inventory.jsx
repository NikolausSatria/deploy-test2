import { query } from "@/libs/db";

export default async function handler(req, res) {
  try {
    const { method, query: reqQuery, body } = req;

    if (method === "GET") {
      const { search, page = 1, limit = 25, allData } = reqQuery;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
        return res.status(400).json({ error: "Invalid page or limit" });
      }

      const offset = (pageNum - 1) * limitNum;
      const values = [];
      let sqlQuery = `
        SELECT idt.date_at,
               SUM(CASE 
                   WHEN idt.in_out LIKE 'IN%' THEN idt.qty 
                   WHEN idt.in_out LIKE 'OUT%' THEN -idt.qty 
                   ELSE 0 
               END) AS qty,
               idt.in_out,
               combined.product_id,
               combined.description,
               combined.type
        FROM inventories_db idt
        INNER JOIN database_sku ds ON idt.id = ds.inventory_db_id
        LEFT JOIN (
          SELECT product_id, product_description AS description, 'product' AS type 
          FROM product_db
          UNION ALL
          SELECT material_id, material_description AS description, 'material' AS type 
          FROM material_db
          UNION ALL
          SELECT material_id, material_description AS description, 'asset' AS type 
          FROM asset_db
        ) AS combined ON ds.product_id = combined.product_id
      `;

      let countQuery = `
        SELECT COUNT(DISTINCT combined.product_id) AS total_count
        FROM (
          SELECT combined.product_id
          FROM inventories_db idt
          INNER JOIN database_sku ds ON idt.id = ds.inventory_db_id
          LEFT JOIN (
            SELECT product_id, product_description AS description, 'product' AS type 
            FROM product_db
            UNION ALL
            SELECT material_id, material_description AS description, 'material' AS type 
            FROM material_db
            UNION ALL
            SELECT material_id, material_description AS description, 'asset' AS type 
            FROM asset_db
          ) AS combined ON ds.product_id = combined.product_id
          GROUP BY combined.product_id
        ) AS combine
      `;

      if (search) {
        sqlQuery += ` WHERE combined.description LIKE CONCAT('%', ?, '%')`;
        countQuery += ` WHERE combine.description LIKE CONCAT('%', ?, '%')`;
        values.push(search);
      }

      sqlQuery += ` GROUP BY combined.product_id, idt.date_at, idt.in_out ORDER BY idt.date_at DESC`;
      if (allData !== "true") {
        sqlQuery += ` LIMIT ? OFFSET ?`;
        values.push(limitNum, offset);
      }

      console.log("SQL Query:", sqlQuery);
      console.log("Values:", values);

      try {
        const totalCountResult = await query({
          query: countQuery,
          values: search ? [search] : [],
        });

        const inventory = await query({
          query: sqlQuery,
          values,
        });

        const totalItems = allData === "true" ? inventory.length : totalCountResult[0].total_count;
        const totalPages = allData === "true" ? 1 : Math.ceil(totalItems / limitNum);

        return res.status(200).json({ inventory, totalPages });
      } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({ error: "Internal server error", details: error.message });
      }
    }

    if (method === "POST") {
      const {
        in_out,
        date_at,
        lot,
        dn,
        po,
        mo,
        qty,
        employees_id,
        product_id
      } = body;
    
      if (!in_out || !date_at || !qty || !employees_id || !product_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
    
      try {
        const addInventoryResult = await query({
          query: `
            INSERT INTO inventories_db (in_out, date_at, lot, dn, po, mo, qty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id;
          `,
          values: [in_out, date_at, lot || null, dn || null, po || null, mo || null, qty],
        });
    
        if (!addInventoryResult.insertId) {
          throw new Error("Failed to insert into inventories_db");
        }
    
        const addSkuResult = await query({
          query: `
            INSERT INTO database_sku (inventory_db_id, product_id, employees_id)
            VALUES (?, ?, ?)
          `,
          values: [addInventoryResult.insertId, product_id, employees_id],
        });
    
        if (!addSkuResult.insertId) {
          throw new Error("Failed to insert into database_sku");
        }
    
        return res.status(201).json({
          message: "Data successfully added",
          data: {
            inventory_id: addInventoryResult.insertId,
            sku_id: addSkuResult.insertId,
          },
        });
      } catch (error) {
        console.error("Error adding data:", error);
        return res.status(500).json({ error: "Error saving data", details: error.message });
      }
    }

    return res.status(405).json({ error: `Method ${method} Not Allowed` });
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
