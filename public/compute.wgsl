@group(0) @binding(0) var<storage, read> first : vec2<f32>;
@group(0) @binding(1) var<storage, read> second : vec2<f32>;
@group(0) @binding(2) var<storage, read_write> result : vec2<f32>;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    result = normalize(first) + sin(second);
}