import math
from typing import Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/visualizer", tags=["Visual Learning"])

class FBDParams(BaseModel):
    mass: float = 10.0 # kg
    angle_deg: float = 30.0 # deg
    mu_k: float = 0.25 # kinetic friction coefficient
    applied_force: float = 0.0 # N (positive = up slope)

class ProjectileParams(BaseModel):
    v0: float = 20.0 # m/s
    angle_deg: float = 45.0 # deg
    height: float = 0.0 # m
    g: float = 9.81

class CarnotParams(BaseModel):
    th: float = 600.0 # K (hot reservoir)
    tc: float = 300.0 # K (cold reservoir)
    v1: float = 1.0 # m^3
    v2: float = 2.0 # m^3
    gamma: float = 1.4 # adiabatic index

@router.post("/fbd")
def calculate_fbd(params: FBDParams):
    """Calculates all free-body diagram vectors for inclined plane."""
    g = 9.81
    theta_rad = math.radians(params.angle_deg)
    
    # Weight
    w_total = params.mass * g
    w_parallel = w_total * math.sin(theta_rad) # down the plane
    w_perp = w_total * math.cos(theta_rad) # into the plane
    
    # Normal force
    normal = w_perp
    
    # Max static / kinetic friction
    friction = params.mu_k * normal
    
    # Net force along slope (positive = up slope)
    f_net = params.applied_force - w_parallel - (friction if (params.applied_force >= w_parallel) else -friction)
    acceleration = f_net / params.mass

    return {
        "mass_kg": params.mass,
        "angle_deg": params.angle_deg,
        "weight_total_N": round(w_total, 2),
        "weight_parallel_N": round(w_parallel, 2),
        "weight_perpendicular_N": round(w_perp, 2),
        "normal_force_N": round(normal, 2),
        "friction_force_N": round(friction, 2),
        "applied_force_N": round(params.applied_force, 2),
        "net_force_N": round(f_net, 2),
        "acceleration_m_s2": round(acceleration, 3),
        "vectors": [
            {"name": "Normal Force (N)", "magnitude": round(normal, 1), "direction_deg": params.angle_deg + 90, "color": "#10b981"},
            {"name": "Gravity Weight (W)", "magnitude": round(w_total, 1), "direction_deg": 270, "color": "#ef4444"},
            {"name": "Friction (f_k)", "magnitude": round(friction, 1), "direction_deg": params.angle_deg + 180, "color": "#f59e0b"},
            {"name": "Applied Force (F)", "magnitude": round(params.applied_force, 1), "direction_deg": params.angle_deg, "color": "#3b82f6"}
        ]
    }

@router.post("/projectile")
def calculate_projectile_trajectory(params: ProjectileParams):
    """Calculates trajectory coordinates x(t), y(t) for projectile motion."""
    angle_rad = math.radians(params.angle_deg)
    v0x = params.v0 * math.cos(angle_rad)
    v0y = params.v0 * math.sin(angle_rad)

    # Flight time
    disc = (v0y**2) + 2 * params.g * params.height
    t_flight = (v0y + math.sqrt(max(0, disc))) / params.g
    max_height = params.height + (v0y**2) / (2 * params.g)
    range_total = v0x * t_flight

    points = []
    num_samples = 40
    for i in range(num_samples + 1):
        t = (t_flight * i) / num_samples
        x = v0x * t
        y = max(0.0, params.height + v0y * t - 0.5 * params.g * (t**2))
        vx = v0x
        vy = v0y - params.g * t
        speed = math.sqrt(vx**2 + vy**2)
        points.append({
            "t": round(t, 2),
            "x": round(x, 2),
            "y": round(y, 2),
            "speed": round(speed, 2)
        })

    return {
        "range_m": round(range_total, 2),
        "max_height_m": round(max_height, 2),
        "flight_time_s": round(t_flight, 2),
        "v0x": round(v0x, 2),
        "v0y": round(v0y, 2),
        "trajectory": points
    }

@router.post("/carnot")
def calculate_carnot_cycle(params: CarnotParams):
    """Calculates thermodynamic Carnot cycle P-V curve points."""
    # State 1: (P1, V1, TH)
    R = 8.314 # J/(mol*K)
    n = 1.0 # 1 mole
    p1 = (n * R * params.th) / params.v1
    
    # State 2: Isothermal expansion to V2 at TH
    p2 = (n * R * params.th) / params.v2
    
    # State 3: Isentropic expansion to TC
    # T * V^(gamma-1) = const => V3 = V2 * (TH/TC)^(1/(gamma-1))
    v3 = params.v2 * ((params.th / params.tc) ** (1.0 / (params.gamma - 1.0)))
    p3 = (n * R * params.tc) / v3

    # State 4: Isothermal compression at TC
    v4 = params.v1 * ((params.th / params.tc) ** (1.0 / (params.gamma - 1.0)))
    p4 = (n * R * params.tc) / v4

    # Thermal efficiency
    eta = 1.0 - (params.tc / params.th)

    return {
        "thermal_efficiency_percent": round(eta * 100, 1),
        "th_kelvin": params.th,
        "tc_kelvin": params.tc,
        "states": [
            {"state": "1 (Start Hot)", "V": round(params.v1, 3), "P": round(p1 / 1000, 1), "T": params.th},
            {"state": "2 (End Isothermal Exp)", "V": round(params.v2, 3), "P": round(p2 / 1000, 1), "T": params.th},
            {"state": "3 (End Adiabatic Exp)", "V": round(v3, 3), "P": round(p3 / 1000, 1), "T": params.tc},
            {"state": "4 (End Isothermal Comp)", "V": round(v4, 3), "P": round(p4 / 1000, 1), "T": params.tc}
        ]
    }
