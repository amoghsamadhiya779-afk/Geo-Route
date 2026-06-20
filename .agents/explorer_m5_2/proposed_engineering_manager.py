import time
import random
import sys

class EngineeringManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EngineeringManager, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        # Current active configurations
        self.cache_size_mb = 256
        self.cache_policy = "LRU"
        self.compile_status = "OPTIMIZED"

        # Compilation simulation parameters
        self.target_compile_status = "OPTIMIZED"
        self.compile_start_time = None
        self.compile_duration = 3.0

        # Accumulated statistics (dynamic counters)
        self.cache_hits = 1024
        self.cache_misses = 89
        
        # Performance parameters (simulated query latencies)
        self.latency_ms = 0.72

    def get_compile_flags(self) -> str:
        """Determines compile flags based on the compilation status and platform."""
        if self.compile_status == "OPTIMIZED":
            if sys.platform == "win32":
                return "/O2 /Ob2 /W4 /WX -std=c++17"
            return "-O3 -march=native -std=c++17 -Wall -Wextra -Wpedantic -Werror -pthread"
        elif self.compile_status == "DEBUG":
            if sys.platform == "win32":
                return "/Od /Zi /W4 /WX -std=c++17"
            return "-O0 -g -std=c++17 -Wall -Wextra -Wpedantic -Werror -pthread"
        elif self.compile_status == "COMPILING":
            return "Compiling... flags pending"
        return "-std=c++17"

    def get_memory_usage(self) -> float:
        """Simulates memory usage dynamically based on cache size and status."""
        base_mem = 45.0  # Base FastAPI memory overhead
        cache_mem = self.cache_size_mb * 0.8  # Assume cache utilization is around 80%
        jitter = random.uniform(-2.0, 2.0)
        return round(max(10.0, base_mem + cache_mem + jitter), 1)

    def get_cpu_usage(self) -> float:
        """Simulates CPU usage. Spike to 90% during compilation, otherwise standard range."""
        if self.compile_status == "COMPILING":
            return round(random.uniform(85.0, 95.0), 1)
        base_cpu = 15.0 if self.compile_status == "DEBUG" else 8.0
        jitter = random.uniform(-1.5, 1.5)
        return round(max(0.1, base_cpu + jitter), 1)

    def trigger_recompile(self, target_status: str):
        """Initiates compilation simulation to target status."""
        self.compile_status = "COMPILING"
        self.target_compile_status = target_status
        self.compile_start_time = time.time()

    def check_compile_status(self):
        """Checks if ongoing compilation is finished. Self-resolves on check."""
        if self.compile_status == "COMPILING" and self.compile_start_time is not None:
            elapsed = time.time() - self.compile_start_time
            if elapsed >= self.compile_duration:
                self.compile_status = self.target_compile_status
                self.compile_start_time = None

    def record_query(self):
        """Updates cache hits/misses and updates query latency overhead based on configurations."""
        self.check_compile_status()
        
        # Compilation status locks the cache/computations or causes high delays
        if self.compile_status == "COMPILING":
            # compilation overhead
            self.latency_ms = round(self.latency_ms * 0.5 + 2000.0 * 0.5, 2)
            return

        # Cache hit rate calculations based on size & policy
        size_factor = min(1.0, self.cache_size_mb / 512.0)  # Max hit rate reached at 512MB
        policy_factor = 0.95 if self.cache_policy == "LRU" else (0.85 if self.cache_policy == "FIFO" else 0.75)
        
        hit_probability = 0.60 + 0.30 * size_factor * policy_factor
        
        if random.random() < hit_probability:
            self.cache_hits += 1
            query_latency = random.uniform(0.1, 0.5)
        else:
            self.cache_misses += 1
            query_latency = random.uniform(2.0, 8.0)
            
        # Debug build runs slower
        if self.compile_status == "DEBUG":
            query_latency *= 2.5
            
        # Smooth the rolling latency using an EMA
        self.latency_ms = round(self.latency_ms * 0.9 + query_latency * 0.1, 2)

    def clear_cache(self):
        """Resets dynamic metrics."""
        self.cache_hits = 0
        self.cache_misses = 0
        self.latency_ms = 0.10

    def get_stats(self) -> dict:
        """Compiles stats conforming to the interface contract."""
        self.check_compile_status()
        
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "compiled_with": self.get_compile_flags(),
            "cpu_usage_pct": self.get_cpu_usage(),
            "memory_usage_mb": self.get_memory_usage(),
            "latency_ms": self.latency_ms,
            "cache_size_mb": self.cache_size_mb,
            "cache_policy": self.cache_policy,
            "compile_status": self.compile_status
        }

    def update_config(self, cache_size_mb: int = None, cache_policy: str = None, compile_status: str = None):
        """Updates settings, triggering compilation if status changes."""
        self.check_compile_status()
        
        if cache_size_mb is not None:
            self.cache_size_mb = cache_size_mb
            
        if cache_policy is not None:
            self.cache_policy = cache_policy
            
        if compile_status is not None:
            if compile_status != self.compile_status:
                self.trigger_recompile(compile_status)
