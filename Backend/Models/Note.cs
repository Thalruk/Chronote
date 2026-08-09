namespace Backend.Models
{
    public class Note
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string UserId { get; set; } = string.Empty;
        public DateTime? TargetDate { get; set; }
        public TimeOnly? TargetTime { get; set; }
        public bool IsArchived { get; set; } = false;
    }
}
