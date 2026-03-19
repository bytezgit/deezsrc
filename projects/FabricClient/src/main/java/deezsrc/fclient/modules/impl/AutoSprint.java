package deezsrc.fclient.modules.impl;

import deezsrc.fclient.modules.Module;
import org.lwjgl.glfw.GLFW;

public class AutoSprint extends Module {

    public AutoSprint() {
        super(
            "AutoSprint", //name
            "Automatically sprints for you", //description
            GLFW.GLFW_KEY_V //keybind using GLFW
        );
    }

    @Override
    public void onEnable() {
        System.out.println("[Sprint] Enabled");
    }

    @Override
    public void onDisable() {
        System.out.println("[Sprint] Disabled");
        if (mc.player != null) {
            mc.player.setSprinting(false);
        }
    }

    @Override
    public void onUpdate() {
        if (mc.player == null) return;

        if (mc.options.keyUp.isDown()) {
            mc.player.setSprinting(true);
        } else {
            mc.player.setSprinting(false);
        }
    }
}