import bpy
import json
import os
import sys

INPUT = sys.argv[-2]
OUTPUT = sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=INPUT)

report = {
    'input': INPUT,
    'output': OUTPUT,
    'operations': [],
    'objects': [],
}

meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
for obj in meshes:
    before = len(obj.data.polygons)
    # AUTOMATABLE: smooth shading is safe for visual geometry and does not
    # change transforms, dimensions contracts, or object identity.
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    report['operations'].append({'class': 'AUTOMATABLE', 'operation': 'smooth_shading', 'object': obj.name})

    # AUTOMATABLE: limit reduction to genuinely dense meshes. This avoids a
    # universal ratio and preserves low-detail mechanical parts untouched.
    if before > 20000:
        modifier = obj.modifiers.new(name='CozyPilotLimitedDecimate', type='DECIMATE')
        modifier.decimate_type = 'COLLAPSE'
        modifier.ratio = 0.68
        modifier.use_collapse_triangulate = False
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
        report['operations'].append({
            'class': 'AUTOMATABLE',
            'operation': 'limited_decimation',
            'object': obj.name,
            'before_polygons': before,
            'after_polygons': len(obj.data.polygons),
            'ratio': 0.68,
        })

    report['objects'].append({
        'name': obj.name,
        'before_polygons': before,
        'after_polygons': len(obj.data.polygons),
        'dimensions': [round(float(v), 6) for v in obj.dimensions],
    })

# ARCHETYPE-SPECIFIC: no caster/armrest/support thickening is applied yet;
# imported GLB names/materials do not provide a reliable semantic mapping.
report['operations'].append({
    'class': 'ARCHETYPE_SPECIFIC',
    'operation': 'caster_support_adjustment',
    'status': 'NOT_APPLIED_REQUIRES_SEMANTIC_MAPPING',
})

# MANUAL-QA_REQUIRED: silhouette and recognition must be checked in-browser.
report['manual_qa'] = [
    'office-chair silhouette remains recognizable',
    'seat/back/armrest/caster structure remains intact',
    'decimation does not introduce visible artifacts',
    'visual scale and bottom grounding remain correct in web runtime',
]

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in {'MESH', 'EMPTY'})
bpy.context.view_layer.objects.active = meshes[0] if meshes else None
bpy.ops.export_scene.gltf(filepath=OUTPUT, export_format='GLB', use_selection=True, export_apply=True)

print(json.dumps(report, ensure_ascii=False))
