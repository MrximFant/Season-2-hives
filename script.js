document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const drawButton = document.getElementById('drawButton');
    const clearButton = document.getElementById('clearButton');
    const layoutSelect = document.getElementById('layoutSelect');

    // --- Game Config & Constants ---
    const GRID_WIDTH_TILES = 100; // Number of columns in our display grid
    const GRID_HEIGHT_TILES = 100; // Number of rows
    const TILE_DISPLAY_SIZE_PX = 8; // How many pixels wide/high each cell is on screen

    const CT_SIZE = 7;
    const MUD_DIAMETER = 21;
    const BASE_SIZE = 3;
    const FURNACE_SIZE = 5;
    const MG_SIZE = 3;
    const STRUCTURE_SPACING = 1; // 1-tile spacing
    const FURNACE_CTC_SPACING = 29; // Center-to-Center for Furnaces

    const COLORS_JS = { // Using JS object for easier access by alliance ID
        CT: "ct-tile",
        MUD_BG: "mud-tile",
        FURNACE: "furnace-tile",
        MG: "mg-tile",
        ALLIANCES: [
            "alliance1-base", "alliance2-base", "alliance3-base", "alliance4-base",
            "alliance5-base", "alliance6-base", "alliance7-base", "alliance8-base"
        ]
    };

    // --- Helper to create the initial empty grid ---
    function createGrid() {
        gridContainer.innerHTML = ''; // Clear previous grid
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_WIDTH_TILES}, ${TILE_DISPLAY_SIZE_PX}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${GRID_HEIGHT_TILES}, ${TILE_DISPLAY_SIZE_PX}px)`;
        gridContainer.style.width = `${GRID_WIDTH_TILES * TILE_DISPLAY_SIZE_PX}px`;
        gridContainer.style.height = `${GRID_HEIGHT_TILES * TILE_DISPLAY_SIZE_PX}px`;

        for (let r = 0; r < GRID_HEIGHT_TILES; r++) {
            for (let c = 0; c < GRID_WIDTH_TILES; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r; // Store row/col for easy identification
                cell.dataset.col = c;
                gridContainer.appendChild(cell);
            }
        }
    }

    // --- Helper to draw/color a structure ---
    // x, y are top-left tile coordinates for the structure
    function drawStructure(topLeftX, topLeftY, widthTiles, heightTiles, cssClass, label = "") {
        for (let r_offset = 0; r_offset < heightTiles; r_offset++) {
            for (let c_offset = 0; c_offset < widthTiles; c_offset++) {
                const R = topLeftY + r_offset;
                const C = topLeftX + c_offset;
                // Find the cell: querySelector is okay for moderate grids, could optimize
                const cell = gridContainer.querySelector(`.grid-cell[data-row='${R}'][data-col='${C}']`);
                if (cell) {
                    cell.className = 'grid-cell'; // Clear previous classes except grid-cell
                    cell.classList.add(cssClass);
                    if (label && r_offset === Math.floor(heightTiles/2) && c_offset === Math.floor(widthTiles/2) ) {
                         // cell.textContent = label; // Add label to center of structure
                    }
                } else {
                    // console.warn(`Cell not found at ${R}, ${C} for ${label}`);
                }
            }
        }
    }
    
    // --- Main Drawing Logic ---
    function drawSelectedHiveLayout() {
        createGrid(); // Recreate the empty grid first
        const selectedLayout = layoutSelect.value;

        if (selectedLayout === "corner") {
            drawCornerFortress();
        } else if (selectedLayout === "ring") {
            drawBufferedRingFortress();
        }
    }

    function drawCornerFortress() {
        // --- Corner Fortress Layout Logic ---
        const hive_offset_x_tiles = 5;
        const hive_offset_y_tiles = 5;
        let current_furnace_x_tile = hive_offset_x_tiles;
        let current_furnace_y_tile = hive_offset_y_tiles;
        const furnace_locations = [];

        // 1. Draw Furnaces (2x4 block)
        for (let i = 0; i < 8; i++) {
            drawStructure(current_furnace_x_tile, current_furnace_y_tile,
                          FURNACE_SIZE, FURNACE_SIZE, COLORS_JS.FURNACE, `F${i+1}`);
            furnace_locations.push({
                x: current_furnace_x_tile,
                y: current_furnace_y_tile,
                cx: current_furnace_x_tile + FURNACE_SIZE / 2, // Center x
                cy: current_furnace_y_tile + FURNACE_SIZE / 2, // Center y
                alliance_idx: i
            });

            if ((i + 1) % 4 === 0) {
                current_furnace_y_tile += FURNACE_CTC_SPACING;
                current_furnace_x_tile = hive_offset_x_tiles;
            } else {
                current_furnace_x_tile += FURNACE_CTC_SPACING;
            }
        }

        // 2. Draw Bases and MG for each alliance (VERY SIMPLIFIED)
        furnace_locations.forEach(f_info => {
            const allianceCssClass = COLORS_JS.ALLIANCES[f_info.alliance_idx];
            // Simple block of bases to one side of the furnace for illustration
            // True dense packing algorithm needed here
            for (let r_base = 0; r_base < 5; r_base++) { // 5x5 illustrative bases
                for (let c_base = 0; c_base < 5; c_base++) {
                    let baseX = f_info.x + FURNACE_SIZE + STRUCTURE_SPACING + (c_base * (BASE_SIZE + STRUCTURE_SPACING));
                    let baseY = f_info.y + (r_base * (BASE_SIZE + STRUCTURE_SPACING));
                    // Basic collision check - don't draw on other furnaces (rudimentary)
                    let canPlace = true;
                    furnace_locations.forEach(other_f => {
                        if (f_info !== other_f) { // Don't check against itself
                           if (baseX < other_f.x + FURNACE_SIZE && baseX + BASE_SIZE > other_f.x &&
                               baseY < other_f.y + FURNACE_SIZE && baseY + BASE_SIZE > other_f.y) {
                               canPlace = false;
                           }
                        }
                    });
                    if(canPlace) {
                        drawStructure(baseX, baseY, BASE_SIZE, BASE_SIZE, allianceCssClass, `B${f_info.alliance_idx+1}`);
                    }
                }
            }
             // Draw MG
            drawStructure(f_info.x - MG_SIZE - STRUCTURE_SPACING, f_info.y, MG_SIZE, MG_SIZE, COLORS_JS.MG, `MG${f_info.alliance_idx+1}`);
        });
    }

    function drawBufferedRingFortress() {
        // --- Buffered Ring Fortress Logic ---
        const MAP_CENTER_X_TILE = Math.floor(GRID_WIDTH_TILES / 2);
        const MAP_CENTER_Y_TILE = Math.floor(GRID_HEIGHT_TILES / 2);

        // 1. Draw CT
        drawStructure(MAP_CENTER_X_TILE - Math.floor(CT_SIZE / 2), MAP_CENTER_Y_TILE - Math.floor(CT_SIZE / 2),
                      CT_SIZE, CT_SIZE, COLORS_JS.CT, "CT");

        // (Optional: Draw MUD background area)

        // 2. Inner Buffer Wedges (Layer A - VERY SIMPLIFIED)
        const mud_outer_radius = (MUD_DIAMETER / 2) + STRUCTURE_SPACING;
        const base_effective_size = BASE_SIZE + STRUCTURE_SPACING;
        const num_buffer_layers = 3;

        for (let i = 0; i < 8; i++) { // Each alliance
            const allianceCssClass = COLORS_JS.ALLIANCES[i];
            const wedge_center_angle_deg = i * 45 + (45 / 2.0);
            let current_radius = mud_outer_radius + (BASE_SIZE / 2.0);

            for (let layer_num = 0; layer_num < num_buffer_layers; layer_num++) {
                const angle_offsets = [-10, 0, 10]; // Degrees from wedge center
                for (const offset of angle_offsets) {
                    const angle_deg = wedge_center_angle_deg + offset;
                    const angle_rad = angle_deg * (Math.PI / 180);
                    const base_center_x = MAP_CENTER_X_TILE + current_radius * Math.cos(angle_rad);
                    const base_center_y = MAP_CENTER_Y_TILE + current_radius * Math.sin(angle_rad);
                    drawStructure(Math.round(base_center_x - BASE_SIZE / 2), Math.round(base_center_y - BASE_SIZE / 2),
                                  BASE_SIZE, BASE_SIZE, allianceCssClass, `A${i+1}`);
                }
                current_radius += base_effective_size;
            }
        }
        
        // 3. Furnace Ring (Layer B)
        const furnace_center_ring_radius = (8 * FURNACE_CTC_SPACING) / (2 * Math.PI);
        const furnace_locations = [];

        for (let i = 0; i < 8; i++) {
            const angle_deg = i * 45 + (45 / 2.0);
            const angle_rad = angle_deg * (Math.PI / 180);
            const furnace_center_x = MAP_CENTER_X_TILE + furnace_center_ring_radius * Math.cos(angle_rad);
            const furnace_center_y = MAP_CENTER_Y_TILE + furnace_center_ring_radius * Math.sin(angle_rad);
            drawStructure(Math.round(furnace_center_x - FURNACE_SIZE / 2), Math.round(furnace_center_y - FURNACE_SIZE / 2),
                          FURNACE_SIZE, FURNACE_SIZE, COLORS_JS.FURNACE, `F${i+1}`);
            furnace_locations.push({
                cx: furnace_center_x, cy: furnace_center_y, alliance_idx: i, angle_deg: angle_deg
            });
        }

        // 4. Main Base Pods & MGs (VERY SIMPLIFIED)
         furnace_locations.forEach(f_info => {
            const allianceCssClass = COLORS_JS.ALLIANCES[f_info.alliance_idx];
            // Example: place a few bases outwards
            for (let k = 1; k < 4; k++) {
                let outer_radius = furnace_center_ring_radius + (FURNACE_SIZE / 2) + (k * base_effective_size) - (BASE_SIZE / 2);
                for (let arc_offset_idx = -1; arc_offset_idx <= 1; arc_offset_idx++) {
                    const angle_deg = f_info.angle_deg + arc_offset_idx * 8;
                    const angle_rad = angle_deg * (Math.PI / 180);
                    const base_center_x = MAP_CENTER_X_TILE + outer_radius * Math.cos(angle_rad);
                    const base_center_y = MAP_CENTER_Y_TILE + outer_radius * Math.sin(angle_rad);
                    drawStructure(Math.round(base_center_x - BASE_SIZE / 2), Math.round(base_center_y - BASE_SIZE / 2),
                                  BASE_SIZE, BASE_SIZE, allianceCssClass, `B${f_info.alliance_idx+1}`);
                }
            }
            // Draw MG
            const mg_radius = furnace_center_ring_radius + (FURNACE_SIZE / 2) + STRUCTURE_SPACING + (MG_SIZE / 2);
            const mg_angle_rad = (f_info.angle_deg + 5) * (Math.PI / 180);
            const mg_center_x = MAP_CENTER_X_TILE + mg_radius * Math.cos(mg_angle_rad);
            const mg_center_y = MAP_CENTER_Y_TILE + mg_radius * Math.sin(mg_angle_rad);
            drawStructure(Math.round(mg_center_x - MG_SIZE / 2), Math.round(mg_center_y - MG_SIZE / 2),
                          MG_SIZE, MG_SIZE, COLORS_JS.MG, `MG${f_info.alliance_idx+1}`);
        });

    }

    // --- Event Listeners ---
    drawButton.addEventListener('click', drawSelectedHiveLayout);
    clearButton.addEventListener('click', createGrid);

    // --- Initial Setup ---
    createGrid(); // Create an empty grid when the page loads
});
