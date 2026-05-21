import PhysicsScene from "../components/PhysicsScene";

export default function FlaskPage() {
  return (
    <div
      style={{
        backgroundColor: "#100f0f",
        backgroundImage: "url(/skill-bg.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <PhysicsScene />
      <div style={{ height: "300vh" }} />
    </div>
  );
}
