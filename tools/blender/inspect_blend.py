import bpy
import json

def vec(v):
    return [round(float(x), 6) for x in v]

scene = bpy.context.scene
objects = []
for obj in scene.objects:
    item = {
        'name': obj.name,
        'type': obj.type,
        'collection': next((c.name for c in obj.users_collection), None),
        'location': vec(obj.location),
        'dimensions': vec(obj.dimensions),
    }
    if obj.type == 'MESH':
        item['vertices'] = len(obj.data.vertices)
        item['polygons'] = len(obj.data.polygons)
        item['materials'] = [m.name for m in obj.data.materials if m]
    objects.append(item)

print(json.dumps({
    'filepath': bpy.data.filepath,
    'blender': bpy.app.version_string,
    'scene': scene.name,
    'unit_system': scene.unit_settings.system,
    'unit_scale': scene.unit_settings.scale_length,
    'camera': scene.camera.name if scene.camera else None,
    'lights': [o.name for o in scene.objects if o.type == 'LIGHT'],
    'collections': [c.name for c in bpy.data.collections],
    'object_count': len(scene.objects),
    'mesh_count': sum(o.type == 'MESH' for o in scene.objects),
    'objects': objects,
}, ensure_ascii=False))
