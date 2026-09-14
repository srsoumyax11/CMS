from app.core.storage import supabase

def init_bucket():
    buckets = supabase.storage.list_buckets()
    bucket_names = [b.name for b in buckets]
    if "avatars" not in bucket_names:
        supabase.storage.create_bucket("avatars", {"public": True})
        print("Created public bucket 'avatars'")
    else:
        print("Bucket 'avatars' already exists")

if __name__ == "__main__":
    init_bucket()
