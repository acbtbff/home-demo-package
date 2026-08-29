import bpy
import json
import sys

path = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
scene = bpy.context.scene
items = []
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    obj.update_tag(refresh={'DATA'})
    items.append({
        'name': obj.name,
        'vertices': len(obj.data.vertices),
        'polygons': len(obj.data.polygons),
        'dimensions': [round(float(v), 6) for v in obj.dimensions],
        'materials': [m.name for m in obj.data.materials if m],
        'modifiers': [m.type for m in obj.modifiers],
    })
print(json.dumps({'mesh_count': len(items), 'objects': items}, ensure_ascii=False))
