const tube_clamp = `# tube clamp

result = cq.Workplane("XY" ).box(3, 3, 0.5).edges("|Z").fillet(0.125)

# Parameters
tube_od = 10.2
wall_thickness = 1.5
hole_diameter = 4.1
hole_spacing = 7.5
hole_start = 10.0
length = 75.0

# Create just the top half of circle
result = (
    cq.Workplane("XY")
    .moveTo(-tube_od/2 - wall_thickness, 0)
    .radiusArc((tube_od/2 + wall_thickness, 0), tube_od/2 + wall_thickness)
    .close()
    .extrude(length)
)

# Cut out tube hole
result = (
    result
    .faces("<Z")
    .workplane()
    .circle(tube_od/2)
    .cutThruAll()
)

# Add holes from top
result = (
    result
    .faces(">Y")
    .workplane()
    .pushPoints([(0, float(z)) for z in range(int(hole_start), int(length-5), int(hole_spacing))])
    .circle(hole_diameter/2)
    .cutThruAll()
)`;

const plate_with_hole = `# plate_with_hole
# The dimensions of the box. These can be modified rather than changing the
# object's code directly.
length = 80.0
height = 60.0
thickness = 10.0
center_hole_dia = 22.0

# Create a box based on the dimensions above and add a 22mm center hole
result = (
    cq.Workplane("XY")
    .box(length, height, thickness)
    .faces(">Z")
    .workplane()
    .hole(center_hole_dia)
)`;

export const models = {
  'default': tube_clamp,
  'plate_with_hole': plate_with_hole
}
