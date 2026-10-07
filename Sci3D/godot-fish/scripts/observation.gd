extends Node3D
const FishLife = preload("res://scripts/fish_life.gd")
const Habitat = preload("res://scripts/underwater.gd")
const ScienceLabels = preload("res://scripts/science_labels.gd")
const ClassroomFont = preload("res://assets/classroom-font-subset.ttf")
const DEFAULT_ORBIT := Vector2(0.35, 0.25)
const VIEW_DISTANCE: float = 8.6
const SWIM_SPEED: float = 0.42
var path_follow: PathFollow3D
var fish: Node3D
var habitat: Node3D
var camera: Camera3D
var orbit := DEFAULT_ORBIT
var zoom_factor: float = 1.0
var dragging: bool = false
var active: bool = true
var labels: Control
var reset_button: Button
var web_callbacks: Array = []
var capture_frozen: bool = false
var paused := false
var speed := 1.0
var pan_mode := false
var pan_dragging := false
var pan_offset := Vector3.ZERO

func _ready() -> void:
	habitat = Habitat.new()
	add_child(habitat)
	_build_fish()
	camera = Camera3D.new()
	camera.fov = 42
	camera.current = true
	add_child(camera)
	_build_ui()
	_update_camera()
	labels.update_labels()
	_connect_web()
	if "--verify" in OS.get_cmdline_user_args(): call_deferred("_verify")
	if "--capture" in OS.get_cmdline_user_args(): call_deferred("_capture")

func _build_fish() -> void:
	var path := Path3D.new()
	path.name = "SwimPath"
	var curve := Curve3D.new()
	var rx: float = 2.0
	var rz: float = 0.95
	var k: float = 0.55228475
	curve.add_point(Vector3(rx, 0, 0), Vector3(0, 0, -rz * k), Vector3(0, 0, rz * k))
	curve.add_point(Vector3(0, 0, rz), Vector3(rx * k, 0, 0), Vector3(-rx * k, 0, 0))
	curve.add_point(Vector3(-rx, 0, 0), Vector3(0, 0, rz * k), Vector3(0, 0, -rz * k))
	curve.add_point(Vector3(0, 0, -rz), Vector3(-rx * k, 0, 0), Vector3(rx * k, 0, 0))
	curve.add_point(Vector3(rx, 0, 0), Vector3(0, 0, -rz * k), Vector3(0, 0, rz * k))
	curve.bake_interval = 0.025
	path.curve = curve
	add_child(path)
	path_follow = PathFollow3D.new()
	path_follow.loop = true
	path_follow.rotation_mode = PathFollow3D.ROTATION_Y
	path_follow.use_model_front = true
	path.add_child(path_follow)
	path_follow.progress_ratio = 0.16
	fish = FishLife.new()
	fish.name = "Fish"
	path_follow.add_child(fish)

func _process(delta: float) -> void:
	if not active or capture_frozen: return
	if not paused:
		var step := delta * speed
		path_follow.progress += step * SWIM_SPEED
		fish.advance(step)
		habitat.advance(step, fish.global_position, fish.global_rotation.y)
	_update_camera()
	labels.update_labels()
	_publish_state()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			_zoom(0.90)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_zoom(1.0 / 0.90)
			get_viewport().set_input_as_handled()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		dragging = event.pressed
	if event is InputEventMouseButton and event.button_index in [MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]:
		pan_dragging = event.pressed
	if event is InputEventMouseMotion and (dragging or pan_dragging):
		if pan_mode or pan_dragging or event.shift_pressed: _pan(event.relative)
		else:
			orbit.x -= event.relative.x * 0.008
			orbit.y = clampf(orbit.y + event.relative.y * 0.006, -0.3, 0.7)
	if event is InputEventScreenDrag:
		if pan_mode: _pan(event.relative)
		else:
			orbit.x -= event.relative.x * 0.008
			orbit.y = clampf(orbit.y + event.relative.y * 0.006, -0.3, 0.7)

func _pan(movement: Vector2) -> void:
	var units := 2.0 * camera.position.distance_to(Vector3(0,-0.1,0)+pan_offset) * tan(deg_to_rad(camera.fov)*0.5) / maxf(1.0,get_viewport().get_visible_rect().size.y)
	pan_offset += (-camera.global_basis.x*movement.x+camera.global_basis.y*movement.y)*units
	pan_offset = pan_offset.limit_length(8.0)
	_update_camera()

func _zoom(multiplier: float) -> void:
	zoom_factor = clampf(zoom_factor * multiplier, 0.40, 1.65)
	_update_camera()
	labels.update_labels()

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index in [MOUSE_BUTTON_RIGHT,MOUSE_BUTTON_MIDDLE] and not event.pressed:
		pan_dragging = false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		dragging = false

func _update_camera() -> void:
	var target := Vector3(0, -0.1, 0) + pan_offset
	var aspect := get_viewport().get_visible_rect().size.aspect()
	var fitted_distance := VIEW_DISTANCE * maxf(1.0, 1.05 / aspect) * zoom_factor
	var offset := Vector3(sin(orbit.x) * cos(orbit.y), sin(orbit.y), cos(orbit.x) * cos(orbit.y)) * fitted_distance
	camera.position = target + offset
	camera.look_at(target)

func reset() -> void:
	paused = false
	speed = 1.0
	pan_mode = false
	pan_dragging = false
	pan_offset = Vector3.ZERO
	labels.visible = true
	orbit = DEFAULT_ORBIT
	zoom_factor = 1.0
	dragging = false
	path_follow.progress_ratio = 0.16
	fish.reset_motion()
	habitat.reset()
	habitat.advance(0.0, fish.global_position, fish.global_rotation.y)
	_update_camera()
	labels.update_labels()
	_publish_state()

func command(action: String, value: Variant) -> void:
	match action:
		"pause": paused = bool(value)
		"speed": speed = clampf(float(value),0.35,2.0)
		"labels": labels.visible = bool(value)
		"pan": pan_mode = bool(value)
		"reset": reset()
	_publish_state()

func _publish_state() -> void:
	if not OS.has_feature("web"): return
	JavaScriptBridge.eval("window.fishSnapshot="+JSON.stringify({"paused":paused,"speed":speed,"labels":labels.visible,"pan":pan_mode,"pan_offset":[pan_offset.x,pan_offset.y,pan_offset.z],"elapsed":fish.elapsed,"progress":path_follow.progress,"zoom":zoom_factor,"active":active}))

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var root := Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var theme_value := Theme.new()
	var font := FontVariation.new()
	font.base_font = ClassroomFont
	font.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): 500.0}
	theme_value.default_font = font
	theme_value.default_font_size = 16
	root.theme = theme_value
	var embedded: bool = OS.has_feature("web") and bool(JavaScriptBridge.eval("new URLSearchParams(location.search).has('embedded')"))
	var title := Label.new()
	root.add_child(title)
	title.position = Vector2(26, 22)
	title.text = "鲫鱼 · 水中观察"
	title.add_theme_font_size_override("font_size", 23)
	title.add_theme_color_override("font_color", Color("30261f"))
	title.visible = not embedded
	var hint := Label.new()
	root.add_child(hint)
	hint.position = Vector2(26, 57)
	hint.text = "拖动改变观察角度 · 滚轮放大缩小"
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color("75695f"))
	hint.visible = not embedded
	labels = ScienceLabels.new()
	root.add_child(labels)
	labels.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	labels.setup(fish, camera)
	reset_button = Button.new()
	reset_button.text = "复位"
	root.add_child(reset_button)
	reset_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	reset_button.offset_left = -44
	reset_button.offset_right = 44
	reset_button.offset_top = -66
	reset_button.offset_bottom = -22
	reset_button.add_theme_color_override("font_color", Color("3f7459"))
	var style := StyleBoxFlat.new()
	style.bg_color = Color("fffaf4")
	style.border_color = Color("e0d2c4")
	style.set_border_width_all(1)
	style.set_corner_radius_all(13)
	reset_button.add_theme_stylebox_override("normal", style)
	var hover := style.duplicate() as StyleBoxFlat
	hover.bg_color = Color("e7f0e9")
	reset_button.add_theme_stylebox_override("hover", hover)
	reset_button.add_theme_stylebox_override("pressed", hover)
	reset_button.visible = not embedded
	reset_button.pressed.connect(reset)

func _connect_web() -> void:
	if not OS.has_feature("web"): return
	var window := JavaScriptBridge.get_interface("window")
	var reset_callback := JavaScriptBridge.create_callback(func(_args): reset())
	var active_callback := JavaScriptBridge.create_callback(func(args):
		active = bool(args[0])
		Engine.max_fps = 60 if active else 4
		RenderingServer.set_render_loop_enabled(active)
	)
	web_callbacks.append(reset_callback)
	web_callbacks.append(active_callback)
	window.fishReset = reset_callback
	window.fishSetActive = active_callback
	var command_callback := JavaScriptBridge.create_callback(func(args): command(str(args[0]),args[1]))
	web_callbacks.append(command_callback)
	window.fishCommand = command_callback
	_publish_state()
	JavaScriptBridge.eval("window.fishState=function(){return window.fishSnapshot;}")
	window.fishReady = true
	JavaScriptBridge.eval("parent.postMessage({type:'science-fish-ready'}, location.origin === 'null' ? '*' : location.origin)")

func _verify() -> void:
	set_process(false)
	var before: float = path_follow.progress
	var camera_before := camera.global_transform
	var fish_before := fish.global_position
	_process(1.0)
	assert(camera.global_transform.is_equal_approx(camera_before), "Camera remains fixed while fish swims")
	assert(fish.global_position.distance_to(fish_before) > 0.3, "Fish moves through the fixed habitat")
	var distance_before := camera.position.distance_to(Vector3(0, -0.1, 0))
	var wheel := InputEventMouseButton.new()
	wheel.pressed = true
	wheel.button_index = MOUSE_BUTTON_WHEEL_UP
	_unhandled_input(wheel)
	assert(camera.position.distance_to(Vector3(0, -0.1, 0)) < distance_before, "Wheel up zooms in")
	wheel.button_index = MOUSE_BUTTON_WHEEL_DOWN
	_unhandled_input(wheel)
	assert(is_equal_approx(zoom_factor, 1.0), "Wheel down reverses zoom")
	assert(is_equal_approx(path_follow.progress - before, SWIM_SPEED), "Default path speed")
	for name_value in ["pectoral_left", "pelvic_left", "dorsal", "anal", "operculum_left", "lower_jaw"]:
		var old_pose: Quaternion = fish.skeleton.get_bone_pose_rotation(fish.bones[name_value])
		fish.advance(0.17)
		assert(not old_pose.is_equal_approx(fish.skeleton.get_bone_pose_rotation(fish.bones[name_value])), "Motion region must change: " + name_value)
	orbit = Vector2(-0.8, 0.6)
	reset()
	assert(orbit.is_equal_approx(DEFAULT_ORBIT) and is_equal_approx(zoom_factor, 1.0), "Reset restores camera and zoom")
	assert(is_zero_approx(fish.elapsed) and is_zero_approx(habitat.clock), "Reset restores all motion phases")
	assert(labels.labels.size() == 6, "Six exterior anatomical labels")
	assert(reset_button.visible, "Native UI has the reset control")
	command("pause",true)
	_process(0.5)
	assert(is_zero_approx(fish.elapsed) and is_zero_approx(habitat.clock), "Pause freezes fish and habitat")
	command("pause",false)
	command("speed",2.0)
	_process(0.5)
	assert(is_equal_approx(fish.elapsed,1.0), "Fast playback scales all motion")
	command("speed",0.35)
	_process(1.0)
	assert(is_equal_approx(fish.elapsed,1.35), "Slow playback scales all motion")
	command("labels",false)
	command("pan",true)
	_pan(Vector2(100,80))
	assert(not labels.visible and pan_offset.length()>0.1, "Labels and pan controls work")
	reset()
	assert(not paused and speed==1.0 and labels.visible and not pan_mode and pan_offset==Vector3.ZERO, "Reset restores all controls")
	print("PASS: fixed camera, fish translation, wheel zoom both directions, reset, fin/gill motion, labels")
	get_tree().quit()

func _capture() -> void:
	await get_tree().create_timer(1.5).timeout
	capture_frozen = true
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://preview.png")
	get_tree().quit()


