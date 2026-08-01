use rand::rngs::SmallRng;
use rand::{Rng, SeedableRng};

pub struct DeterministicRng {
    inner: SmallRng,
}

impl DeterministicRng {
    pub fn new(seed: u64) -> Self {
        Self {
            inner: SmallRng::seed_from_u64(seed),
        }
    }

    pub fn gen_range(&mut self, min: f32, max: f32) -> f32 {
        self.inner.gen_range(min..max)
    }

    pub fn gen_range_u32(&mut self, min: u32, max: u32) -> u32 {
        self.inner.gen_range(min..max)
    }

    pub fn gen_bool(&mut self, p: f32) -> bool {
        self.inner.gen_bool(p as f64)
    }

    pub fn fork(&mut self) -> DeterministicRng {
        let seed: u64 = self.inner.gen();
        DeterministicRng::new(seed)
    }
}
