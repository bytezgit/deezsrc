package deezsrc.fclient.modules;

import deezsrc.fclient.modules.impl.AutoSprint;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.Minecraft;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayList;
import java.util.List;

public class ModuleManager {

    private static final List<Module> modules = new ArrayList<>();

    public static void init() {
        // Register all modules here
        register(new AutoSprint());


        ClientTickEvents.END_CLIENT_TICK.register(ModuleManager::onTick);
    }

    private static void register(Module module) {
        modules.add(module);
    }

    private static void onTick(Minecraft client) {
        for (Module module : modules) {

            if (module.getKey() != GLFW.GLFW_KEY_UNKNOWN) {
                long window = GLFW.glfwGetCurrentContext();
                if (KeyTracker.wasJustPressed(window, module.getKey())) {
                    module.toggle();
                }
            }

            if (module.isEnabled()) {
                module.onUpdate();
            }
        }
    }

    public static List<Module> getModules() {
        return modules;
    }

    public static Module getModule(Class<? extends Module> clazz) {
        for (Module module : modules) {
            if (module.getClass().equals(clazz)) {
                return module;
            }
        }
        return null;
    }

    private static class KeyTracker {
        private static final List<Integer> heldKeys = new ArrayList<>();

        public static boolean wasJustPressed(long window, int key) {
            boolean isDown = GLFW.glfwGetKey(window, key) == GLFW.GLFW_PRESS;

            if (isDown && !heldKeys.contains(key)) {
                heldKeys.add(key);
                return true;
            } else if (!isDown) {
                heldKeys.remove(Integer.valueOf(key));
            }

            return false;
        }
    }
}