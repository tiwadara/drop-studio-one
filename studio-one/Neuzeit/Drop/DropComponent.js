// ********************************************************************************************
// Neuzeit Instruments "Drop" - control surface component
//   - Grid (4x4)      -> host Launcher clip cells (kCellsOnly)
//   - Scene column     -> whole-scene / "bank" launch (kScenesOnly)
//   - Track-stop row   -> Launcher stop modifier (hold + grid pad = stop)
//   - Session arrows   -> move the Launcher focus box
// Modeled on the Studio One Novation Launchpad MK3 integration.
// ********************************************************************************************

include_file("resource://com.presonus.musicdevices/sdk/controlsurfacecomponent.js");
include_file("resource://com.presonus.musicdevices/sdk/musicprotocol.js");
include_file("DropProtocol.js");

var PadMode;
(function (PadMode) {
    PadMode[PadMode["kNone"]     = 0] = "kNone";
    PadMode[PadMode["kLauncher"] = 1] = "kLauncher";
})(PadMode || (PadMode = {}));

class DropComponent extends PreSonus.ControlSurfaceComponent {
    onInit(hostComponent) {
        super.onInit(hostComponent);
        this.debugLog = false;
        this.model = hostComponent.model;

        let root = this.model.root;

        // Seed the color table so clip colors resolve to a Drop palette index (velocity - 2).
        let colorMapper = root.findColorTable("DropColors");
        if (colorMapper)
            DropProtocol.kDropColors.forEach((c) => { colorMapper.addColor(c); });

        // Params.
        let paramList = hostComponent.paramList;
        this.stopModifier = paramList.addParam("stopModifier");

        // --- Grid -> clip cells --------------------------------------------------------------
        this.padSection = root.find("PadSectionElement");
        let c = this.padSection.component;
        c.addNullHandler();                                          // mode 0 = kNone
        c.addHandlerForRole(PreSonus.PadSectionRole.kLauncherInput); // mode 1 = kLauncher
        this.launcherHandler = c.getHandler(PadMode.kLauncher);
        this.launcherHandler.setMappingMode(PreSonus.PadSectionLauncherMode.kCellsOnly);
        c.setActiveHandler(PadMode.kLauncher);
        this.gridComponent = c;

        // --- Scene column -> whole-scene ("bank") launch -------------------------------------
        this.sceneSection = root.find("SceneSectionElement");
        if (this.sceneSection) {
            let s = this.sceneSection.component;
            s.addNullHandler();
            s.addHandlerForRole(PreSonus.PadSectionRole.kLauncherInput);
            this.sceneHandler = s.getHandler(PadMode.kLauncher);
            this.sceneHandler.setMappingMode(PreSonus.PadSectionLauncherMode.kScenesOnly);
            s.setActiveHandler(PadMode.kLauncher);
        }
    }

    onExit() {
        super.onExit();
    }

    paramChanged(param) {
        if (param == this.stopModifier) {
            if (this.gridComponent)
                this.gridComponent.setModifierActive(param.value, PreSonus.PadModifier.kLauncherStop);
        } else {
            super.paramChanged(param);
        }
    }

    // Release the grids while the surface is suspended, re-arm on resume.
    onSuspend(state) {
        let mode = state ? PadMode.kNone : PadMode.kLauncher;
        if (this.padSection)   this.padSection.component.setActiveHandler(mode);
        if (this.sceneSection) this.sceneSection.component.setActiveHandler(mode);
    }

    // --- Launcher viewport navigation (Drop session arrows) --------------------------------
    onLauncherNavigateUp(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setRowOffset(this.launcherHandler.getRowOffset() - 1);
    }
    onLauncherNavigateDown(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setRowOffset(this.launcherHandler.getRowOffset() + 1);
    }
    onLauncherNavigateLeft(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setColumnOffset(this.launcherHandler.getColumnOffset() - 1);
    }
    onLauncherNavigateRight(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setColumnOffset(this.launcherHandler.getColumnOffset() + 1);
    }

    // --- Absolute scene/bank jump (Drop Program Change) ------------------------------------
    // A PC message (one per program number, bound in the surface) jumps the launcher viewport
    // to an ABSOLUTE bank: program N -> scene row N * kRowsPerJump. Set kRowsPerJump = 1 for
    // per-scene granularity, or 4 (grid height) for whole-page/bank jumps.
    onLauncherJumpScene(index) {
        if (!this.launcherHandler) return;
        let rows = DropComponent.kRowsPerJump;
        this.launcherHandler.setRowOffset(index * rows);
        if (this.sceneHandler)
            this.sceneHandler.setRowOffset(index * rows);
    }

    // --- Launcher PAGE navigation (bottom pad row) - jump by a full grid (4) ----------------
    onLauncherPageUp(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setRowOffset(this.launcherHandler.getRowOffset() - 4);
    }
    onLauncherPageDown(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setRowOffset(this.launcherHandler.getRowOffset() + 4);
    }
    onLauncherPageLeft(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setColumnOffset(this.launcherHandler.getColumnOffset() - 4);
    }
    onLauncherPageRight(state) {
        if (!state || !this.launcherHandler) return;
        this.launcherHandler.setColumnOffset(this.launcherHandler.getColumnOffset() + 4);
    }
}

// Scenes to jump per Program-Change step. 1 = program N lands on scene N (direct);
// 4 = whole grid (bank) jump per program step.
DropComponent.kRowsPerJump = 1;

function createDropComponentInstance() {
    return new DropComponent;
}
