import { put, head } from "@vercel/blob";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");

  var slug = req.query.slug;
  if (!slug) return res.status(400).json({ error: "no slug" });

  var blobName = "counts/" + slug + ".json";

  if (req.method === "GET") {
    try {
      var blob = await head(blobName);
      var res2 = await fetch(blob.url);
      var data = await res2.json();
      return res.status(200).json({ count: data.count || 0 });
    } catch {
      return res.status(200).json({ count: 0 });
    }
  }

  if (req.method === "POST") {
    try {
      var count = 0;
      try {
        var blob = await head(blobName);
        var res2 = await fetch(blob.url);
        var data = await res2.json();
        count = data.count || 0;
      } catch {}

      count++;

      await put(blobName, JSON.stringify({ count }), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({ count });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}