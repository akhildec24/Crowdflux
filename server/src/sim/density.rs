pub struct DensityGrid {
    pub width: u32,
    pub height: u32,
    pub cell_size: f32,
    pub cells: Vec<f32>,
    pub flow_x: Vec<f32>,
    pub flow_z: Vec<f32>,
}

impl DensityGrid {
    pub fn new(world_size: f32, cell_size: f32) -> Self {
        let dim = (world_size / cell_size).ceil() as u32;
        let total = (dim * dim) as usize;
        Self {
            width: dim,
            height: dim,
            cell_size,
            cells: vec![0.0; total],
            flow_x: vec![0.0; total],
            flow_z: vec![0.0; total],
        }
    }

    pub fn clear(&mut self) {
        self.cells.fill(0.0);
        self.flow_x.fill(0.0);
        self.flow_z.fill(0.0);
    }

    #[inline]
    pub fn world_to_cell(&self, x: f32, z: f32) -> (u32, u32) {
        let cx = ((x / self.cell_size).floor() as i32).max(0).min(self.width as i32 - 1) as u32;
        let cz = ((z / self.cell_size).floor() as i32).max(0).min(self.height as i32 - 1) as u32;
        (cx, cz)
    }

    #[inline]
    pub fn cell_index(&self, cx: u32, cz: u32) -> usize {
        (cz * self.width + cx) as usize
    }

    pub fn add_agent(&mut self, x: f32, z: f32, vx: f32, vz: f32) {
        let (cx, cz) = self.world_to_cell(x, z);
        let idx = self.cell_index(cx, cz);
        self.cells[idx] += 1.0;
        self.flow_x[idx] += vx;
        self.flow_z[idx] += vz;
    }

    pub fn density_at(&self, x: f32, z: f32) -> f32 {
        let (cx, cz) = self.world_to_cell(x, z);
        self.cells[self.cell_index(cx, cz)]
    }

    pub fn max_density(&self) -> f32 {
        self.cells.iter().cloned().fold(0.0f32, f32::max)
    }

    pub fn density_factor(&self, x: f32, z: f32) -> f32 {
        let (cx, cz) = self.world_to_cell(x, z);
        let mut sum = 0.0;
        let mut count = 0.0;
        for dz in -1i32..=1 {
            for dx in -1i32..=1 {
                let nx = cx as i32 + dx;
                let nz = cz as i32 + dz;
                if nx >= 0 && nx < self.width as i32 && nz >= 0 && nz < self.height as i32 {
                    sum += self.cells[self.cell_index(nx as u32, nz as u32)];
                    count += 1.0;
                }
            }
        }
        let avg = sum / count;
        let cell_area = self.cell_size * self.cell_size;
        let density_per_m2 = avg / cell_area;
        (density_per_m2 / 4.0).min(1.0)
    }
}
