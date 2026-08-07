namespace Backend.DTOs
{
    public record NoteResponseDto(
      Guid Id,
      string Title,
      string Content,
      DateTime CreatedAt,
      DateTime? TargetDate,
      TimeOnly? TargetTime
  );

    public record CreateNoteDto(
        string Title,
        string Content,
        DateTime? TargetDate,
         TimeOnly? TargetTime
    );

    public record UpdateNoteDto(
        Guid Id,
        string Title,
        string Content,
        DateTime? TargetDate,
         TimeOnly? TargetTime
    );
}
