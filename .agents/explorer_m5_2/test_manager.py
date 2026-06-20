import sys
import os
import time

# Add current agent directory to path
sys.path.append(os.path.dirname(__file__))

from proposed_engineering_manager import EngineeringManager

def test_manager():
    em = EngineeringManager()
    
    # Check defaults
    stats = em.get_stats()
    print("Initial stats:", stats)
    assert stats["cache_size_mb"] == 256
    assert stats["cache_policy"] == "LRU"
    assert stats["compile_status"] == "OPTIMIZED"
    
    # Query simulation
    hits_before = em.cache_hits
    misses_before = em.cache_misses
    em.record_query()
    stats_after = em.get_stats()
    print("Stats after query:", stats_after)
    assert (em.cache_hits + em.cache_misses) == (hits_before + misses_before + 1)
    
    # Config update - compile change
    em.update_config(compile_status="DEBUG")
    assert em.compile_status == "COMPILING"
    
    stats_during = em.get_stats()
    print("Stats during compilation:", stats_during)
    assert stats_during["compile_status"] == "COMPILING"
    assert stats_during["cpu_usage_pct"] > 80.0
    
    # Wait for compile simulation completion
    print("Waiting 3.1s for compilation to complete...")
    time.sleep(3.1)
    stats_final = em.get_stats()
    print("Stats after compilation:", stats_final)
    assert stats_final["compile_status"] == "DEBUG"
    
    # Clear cache
    em.clear_cache()
    stats_cleared = em.get_stats()
    print("Stats after clear cache:", stats_cleared)
    assert stats_cleared["cache_hits"] == 0
    assert stats_cleared["cache_misses"] == 0

    print("All checks passed successfully!")

if __name__ == "__main__":
    test_manager()
