import { query } from "@/libs/db";

export default async function handler(req, res) {
  try {
    const { method, query: reqQuery } = req;

    if (method === "GET") {
      const { search, page = 1, limit = 25 } = reqQuery;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
        return res.status(400).json({ error: "Invalid page or limit" });
      }

      const offset = (pageNum - 1) * limitNum;
      const values = [];
      let sqlQuery = `
        SELECT pd.product_id as id, pd.product_description as description, '' as material_type, 'product' as type, uom 
        FROM product_db pd 
        UNION ALL 
        SELECT md.material_id as id, md.material_description as description, md.material_type, 'material' as type, '' as uom 
        FROM material_db md 
        UNION ALL 
        SELECT ad.material_id as id, ad.material_description as description, ad.material_type, 'asset' as type, '' as uom 
        FROM asset_db ad
      `;
      let countQuery = `
        SELECT COUNT(*) AS total_count FROM (
          SELECT pd.product_id as id, pd.product_description as description, '' as material_type, 'product' as type 
          FROM product_db pd 
          UNION ALL 
          SELECT md.material_id as id, md.material_description as description, md.material_type, 'material' as type 
          FROM material_db md 
          UNION ALL 
          SELECT ad.material_id as id, ad.material_description as description, ad.material_type, 'asset' as type 
          FROM asset_db ad
        ) as combined
      `;

      if (search) {
        sqlQuery = `
          SELECT pd.product_id as id, pd.product_description as description, '' as material_type, 'product' as type 
          FROM product_db pd 
          WHERE pd.product_description LIKE CONCAT('%', ?, '%') OR pd.product_id LIKE CONCAT('%', ?, '%')
          UNION ALL
          SELECT md.material_id as id, md.material_description as description, md.material_type, 'material' as type 
          FROM material_db md 
          WHERE md.material_description LIKE CONCAT('%', ?, '%') OR md.material_id LIKE CONCAT('%', ?, '%')
          UNION ALL
          SELECT ad.material_id as id, ad.material_description as description, ad.material_type, 'asset' as type 
          FROM asset_db ad 
          WHERE ad.material_description LIKE CONCAT('%', ?, '%') OR ad.material_id LIKE CONCAT('%', ?, '%')
        `;
        countQuery = `
          SELECT COUNT(*) AS total_count FROM (
            SELECT pd.product_id as id, pd.product_description as description, '' as material_type, 'product' as type 
            FROM product_db pd 
            WHERE pd.product_description LIKE CONCAT('%', ?, '%') OR pd.product_id LIKE CONCAT('%', ?, '%')
            UNION ALL
            SELECT md.material_id as id, md.material_description as description, md.material_type, 'material' as type 
            FROM material_db md 
            WHERE md.material_description LIKE CONCAT('%', ?, '%') OR md.material_id LIKE CONCAT('%', ?, '%')
            UNION ALL
            SELECT ad.material_id as id, ad.material_description as description, ad.material_type, 'asset' as type 
            FROM asset_db ad 
            WHERE ad.material_description LIKE CONCAT('%', ?, '%') OR ad.material_id LIKE CONCAT('%', ?, '%')
          ) as combined
        `;
        values.push(search, search, search, search, search, search);
      }

      sqlQuery += ` LIMIT ? OFFSET ?`;
      values.push(parseInt(limitNum), parseInt(offset));

      console.log("SQL Query:", sqlQuery);
      console.log("Values:", values);

      try {
        const totalCountResult = await query({
          query: countQuery,
          values: search ? [search, search, search, search, search, search] : [],
        });

        const dbsku = await query({
          query: sqlQuery,
          values,
        });

        const totalItems = totalCountResult[0].total_count;
        const totalPages = Math.ceil(totalItems / limitNum);

        return res.status(200).json({
          dbsku: dbsku, 
          totalPages: totalPages
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }

    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}