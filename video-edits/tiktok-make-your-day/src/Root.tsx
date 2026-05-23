import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FutureSelfBirthdayNote"
        component={MyComposition}
        durationInFrames={1032}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
