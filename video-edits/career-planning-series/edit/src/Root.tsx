import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CareerPlanningSeries"
        component={MyComposition}
        durationInFrames={4217}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
