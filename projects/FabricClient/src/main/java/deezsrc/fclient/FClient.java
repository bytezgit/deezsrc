package deezsrc.fclient;

import deezsrc.fclient.modules.ModuleManager;
import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FClient implements ModInitializer {

    public static final String MOD_ID = "fclient";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("FClient initializing...");

        ModuleManager.init();

        LOGGER.info("Loaded {} modules.",
            ModuleManager.getModules().size());
    }
}