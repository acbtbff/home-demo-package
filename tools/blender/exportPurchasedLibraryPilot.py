"""Export three purchased Blender furniture sources as self-contained Cozy GLBs.

Usage (Blender 4.3+):
  blender --background --python exportPurchasedLibraryPilot.py -- \
    --source path/to/7.blend --target path/to/nightstand-library-v0.glb --asset NIGHTSTAND

The source .blend is only read in memory and is never saved. Non-mesh scene
objects are removed from the export scene; existing image textures/material
graphs are replaced with simple local Principled materials.
"""

import argparse
import json
import os
import sys

import bpy
from mathutils import Vector


ASSET_CONFIG = {
    "NIGHTSTAND": {
        "wood": (0.42, 0.25, 0.13, 1.0),
        "cream": (0.82, 0.76, 0.65, 1.0),
        "metal": (0.34, 0.33, 0.30, 1.0),
    },
    "DOUBLE_BED": {
        "wood": (0.42, 0.25, 0.13, 1.0),
        "cream": (0.78, 0.74, 0.66, 1.0),
        "metal": (0.34, 0.33, 0.30, 1.0),
    },
    "CABINET": {
        "wood": (0.48, 0.30, 0.17, 1.0),
        "cream": (0.78, 0.73, 0.64, 1.0),
        "metal": (0.34, 0.33, 0.30, 1.0),
    },
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--asset", required=True, choices=sorted(ASSET_CONFIG))
    parser.add_argument("--audit-json")
    return parser.parse_args(argv)


def material(name, color, roughness=0.82):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = roughness
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def choose_material(obj, asset, materials):
    token = f"{obj.name} {' '.join(slot.name for slot in obj.material_slots)}".lower()
    if asset == "DOUBLE_BED" and any(word in token for word in ("mattress", "bedcloth", "fabric", "cushion", "pillow")):
        return materials["cream"]
    if any(word in token for word in ("metal", "handle", "knob", "hinge", "leg")):
        return materials["metal"]
    if any(word in token for word in ("door", "drawer", "front", "panel", "top")) and asset != "DOUBLE_BED":
        return materials["cream"]
    return materials["wood"]


def object_info(obj):
    dimensions = tuple(round(float(value), 6) for value in obj.dimensions)
    return {
        "name": obj.name,
        "type": obj.type,
        "dimensions": dimensions,
        "location": tuple(round(float(value), 6) for value in obj.location),
        "materialSlots": [slot.name for slot in obj.material_slots],
    }


def export_asset(source, target, asset, audit_json=None):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(source), load_ui=False)
    original_objects = [object_info(obj) for obj in bpy.context.scene.objects]
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError(f"No mesh objects found in {source}")

    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)

    colors = ASSET_CONFIG[asset]
    materials = {
        key: material(f"MYROOMIE_{asset}_{key}", value)
        for key, value in colors.items()
    }
    for obj in mesh_objects:
        chosen = choose_material(obj, asset, materials)
        obj.data.materials.clear()
        obj.data.materials.append(chosen)
        obj.select_set(True)

    # Purchased scenes commonly contain meshes positioned far from the scene
    # origin. Normalize the visual asset around X/Z=0 with its lowest point at
    # Y=0; this affects only the exported VisualModel, never physical facts.
    bpy.context.view_layer.update()
    world_corners = [
        obj.matrix_world @ Vector(corner)
        for obj in mesh_objects
        for corner in (obj.bound_box)
    ]
    min_x = min(corner.x for corner in world_corners)
    max_x = max(corner.x for corner in world_corners)
    min_y = min(corner.y for corner in world_corners)
    min_z = min(corner.z for corner in world_corners)
    max_z = max(corner.z for corner in world_corners)
    offset_x = (min_x + max_x) / 2
    offset_z = (min_z + max_z) / 2
    for obj in mesh_objects:
        obj.location.x -= offset_x
        obj.location.y -= min_y
        obj.location.z -= offset_z
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = mesh_objects[0]

    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(target),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )

    result = {
        "asset": asset,
        "source": os.path.abspath(source),
        "target": os.path.abspath(target),
        "sourceObjects": original_objects,
        "exportedMeshObjects": [object_info(obj) for obj in mesh_objects],
        "meshCount": len(mesh_objects),
        "targetBytes": os.path.getsize(target),
        "sourceBlendVersion": bpy.app.version_string,
    }
    if audit_json:
        os.makedirs(os.path.dirname(os.path.abspath(audit_json)), exist_ok=True)
        with open(audit_json, "w", encoding="utf-8") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False))


def main():
    args = parse_args()
    export_asset(args.source, args.target, args.asset, args.audit_json)


if __name__ == "__main__":
    main()
