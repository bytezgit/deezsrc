package deezsrc.fclient.modules;

import net.minecraft.client.Minecraft;


public abstract class Module {

    protected static final Minecraft mc = Minecraft.getInstance();

    private final String name;
    private final String description;
    private final int key;

    private boolean enabled = false;

    public Module(String name, String description, int key) {
        this.name = name;
        this.description = description;
        this.key = key;
    }

    public void onEnable() {}
    public void onDisable() {}
    public void onUpdate() {}

    public void toggle() {
        enabled = !enabled;
        if (enabled) {
            onEnable();
        } else {
            onDisable();
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        if (this.enabled != enabled) {
            toggle();
        }
    }

    public String getName()        { return name; }
    public String getDescription() { return description; }
    public int getKey()            { return key; }
}