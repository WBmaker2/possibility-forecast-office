import { missions } from "../app/content/missions";
import { tutorialActivity } from "../app/content/tutorial";
import { validateContent } from "../app/content/validate-content";

const errors = validateContent([tutorialActivity, ...missions]);

if (errors.length > 0) {
  console.error("콘텐츠 검증 실패:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("콘텐츠 검증 통과: 안내 활동 1개와 일반 미션 5개");
}
