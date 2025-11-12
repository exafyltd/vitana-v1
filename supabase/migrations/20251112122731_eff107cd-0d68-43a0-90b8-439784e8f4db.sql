-- Make chat-attachments bucket public so getPublicUrl works
update storage.buckets 
set public = true 
where id = 'chat-attachments';