// Overlay canvas drawn on top of the webcam video for face detection boxes.
export default function FaceOverlay({ canvasRef }) {
  return <canvas ref={canvasRef} className="overlay-canvas" />;
}
