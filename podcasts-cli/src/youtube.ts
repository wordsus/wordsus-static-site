import fs from "fs";
import path from "path";
import { log } from "./logger.js";

const YOUTUBE_INFO_TEMPLATE = `\
══════════════════════════════════════════════════
{podcast} — Episode {episode}
══════════════════════════════════════════════════

PODCAST SHOW
------------
{podcast}

TITLE
-----
{title}

DESCRIPTION
-----------
{description}

VIDEO FILE
----------
{video_file}
══════════════════════════════════════════════════
`;

export function generateYoutubeInfo(params: {
  infoPath: string;
  metadata: any;
  videoFile: string;
}): void {
  const { infoPath, metadata, videoFile } = params;

  const description = metadata.description || "";
  const locale = (metadata.locale || "es").toLowerCase();
  const source = metadata.source || "";

  let sourceInfo = "";
  if (locale === "es") {
    sourceInfo = `\n\n📚 *Fuentes del episodio*\nPuedes leer el artículo completo utilizado en este episodio en:\n${source}`;
  } else {
    sourceInfo = `\n\n📚 *Episode Sources*\nYou can read the full article used in this episode at:\n${source}`;
  }

  const fullDescription = `${description}${sourceInfo}`;

  const content = YOUTUBE_INFO_TEMPLATE
    .replaceAll("{podcast}", metadata.podcast || "N/A")
    .replaceAll("{episode}", metadata.episode || "N/A")
    .replaceAll("{title}", metadata.title || "N/A")
    .replaceAll("{description}", fullDescription)
    .replaceAll("{video_file}", path.basename(videoFile));

  fs.writeFileSync(infoPath, content, "utf-8");
  log("INFO", `YouTube upload info written: ${infoPath}`);
}
