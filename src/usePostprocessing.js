import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  KernelSize,
  Resolution,
  SMAAEffect,
  VignetteEffect,
} from "postprocessing";

function usePostprocessing(settings) {
  const { gl, scene, camera } = useThree();
  const [width, height] = useThree((state) => [state.size.width, state.size.height]);

  const { bloom, composer, vignette } = useMemo(() => {
    const composer = new EffectComposer(gl, {
      multisampling: 0,
      antialias: false,
      alpha: false,
    });
    const renderPass = new RenderPass(scene, camera);

    const BLOOM = new BloomEffect(
      {
        mipmapBlur: true,
        luminanceThreshold: 0.65,
        luminanceSmoothing: 0.01,
        intensity: 2,
        kernelSize: KernelSize.MEDIUM,
        resolutionScale: 0.5,
        resolutionX:Resolution.AUTO_SIZE,
        resolutionY:Resolution.AUTO_SIZE,
        width:Resolution.AUTO_SIZE,
        height:Resolution.AUTO_SIZE,
      }
    );

    const VIGNETTE = new VignetteEffect({
      darkness: 0.6,
      offset: 0.3
    });

    composer.addPass(renderPass);
    composer.addPass(new EffectPass(camera, new SMAAEffect()));
    composer.addPass(new EffectPass(camera, BLOOM));
    composer.addPass(new EffectPass(camera, VIGNETTE));

    return {
      bloom: BLOOM,
      composer,
      vignette: VIGNETTE,
    };
  }, [gl, scene, camera]);

  useEffect(
    () => void composer.setSize(width, height),
    [composer, width, height]
  );

  useEffect(() => {
    bloom.intensity = settings.bloomIntensity;
    vignette.darkness = settings.vignetteDarkness;
  }, [bloom, settings.bloomIntensity, settings.vignetteDarkness, vignette]);

  useEffect(() => {
    return () => {
      composer.dispose();
    };
  }, [composer]);

  useFrame((_, delta) => {
    composer.render(delta);
  }, 1);
}

export default usePostprocessing;
