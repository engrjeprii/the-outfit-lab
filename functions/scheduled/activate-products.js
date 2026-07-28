import { activateReleasedProducts } from "../_shared.js";

export async function scheduled(controller, env, context) {
  try {
    const activated = await activateReleasedProducts(env);
    console.log(`Activated ${activated} upcoming product(s)`);
  } catch (err) {
    console.error("Failed to activate upcoming products:", err);
  }
}
