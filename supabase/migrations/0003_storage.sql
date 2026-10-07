-- 0003: listing-images bucket, own-folder storage policies, 1-5 images per listing
-- NOTE: delete any listings created before this migration (they have no images).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880,
        array['image/jpeg','image/png','image/webp']);

create policy "Upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images'
              and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Public bucket = anyone can view by URL. This policy is still required because
-- deleting a file needs both select and delete permission.
create policy "Read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'listing-images'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- If this fails, find the real constraint name under Table Editor -> listings -> Constraints
alter table public.listings drop constraint listings_image_paths_check;
alter table public.listings add constraint listings_image_paths_check
  check (cardinality(image_paths) between 1 and 5);

-- Hardening: image paths must live inside the owner's own storage folder
drop policy "Create own listings" on public.listings;
drop policy "Update own listings" on public.listings;
create policy "Create own listings" on public.listings
  for insert to authenticated with check (
    seller_id = (select auth.uid())
    and not exists (select 1 from unnest(image_paths) p
                    where p not like (select auth.uid())::text || '/%')
  );
create policy "Update own listings" on public.listings
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (
    seller_id = (select auth.uid())
    and not exists (select 1 from unnest(image_paths) p
                    where p not like (select auth.uid())::text || '/%')
  );
