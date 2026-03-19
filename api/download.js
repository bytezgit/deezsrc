import { put, list } from "@vercel/blob";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");

  var slug = req.query.slug;
  if (!slug) return res.status(400).json({ error: "no slug" });

  var blobName = "counts/" + slug + ".json";

    async function getCount() {
    try {
        var blobs = await list({ prefix: blobName });
        if (!blobs.blobs.length) return 0;
        var sorted = blobs.blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        var response = await fetch(sorted[0].url + "?t=" + Date.now());
        var data = JSON.parse(await response.text());
        return typeof data.count === "number" ? data.count : 0;
    } catch {
        return 0;
    }
    }
  if (req.method === "GET") {
    var count = await getCount();
    return res.status(200).json({ count: count });
  }

  if (req.method === "POST") {
    try {
      var count = await getCount();
      count++;

      await put(blobName, JSON.stringify({ count: count }), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      return res.status(200).json({ count: count });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
}